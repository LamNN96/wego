package com.lamnn.wego.screen.trip.setting_trip;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.Toast;

import com.lamnn.wego.R;
import com.lamnn.wego.data.model.Trip;
import com.lamnn.wego.data.model.User;
import com.lamnn.wego.data.model.UserLocation;
import com.lamnn.wego.data.remote.TripService;
import com.lamnn.wego.screen.trip.create_trip.ShareCodeActivity;
import com.lamnn.wego.screen.map.MapsActivity;
import com.lamnn.wego.utils.APIUtils;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

import static com.lamnn.wego.screen.details.info_user.InfoUserActivity.EXTRA_USER;
import static com.lamnn.wego.screen.details.info_user.InfoUserActivity.EXTRA_USER_LOCATION;

public class SettingTripActivity extends AppCompatActivity implements View.OnClickListener, SettingTripContract.View {

    private EditText mTextNameTrip, mTextIdTrip;
    private ProgressBar mProgressBar;
    private Toolbar mToolbar;
    private Button mButtonDone, mButtonOutTrip;
    private Trip mTrip;
    private UserLocation mUserLocation;
    private SettingTripContract.Presenter mPresenter;
    private TripService mTripService = APIUtils.getTripService();

    public static Intent getIntent(Context context, Trip trip, UserLocation userLocation) {
        Intent intent = new Intent(context, SettingTripActivity.class);
        intent.putExtra(ShareCodeActivity.EXTRA_TRIP, trip);
        intent.putExtra(EXTRA_USER_LOCATION, userLocation);
        return intent;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_setting_trip);
        receiveData();
        initView();
        initToolbar();
        mPresenter = new SettingTripPresenter(this, this);
        mPresenter.updateUserLocation(mUserLocation);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case android.R.id.home:
                finish();
                break;
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    public void onClick(View v) {
        switch (v.getId()) {
            case R.id.btn_create_done:
                updateTrip();
                break;
            case R.id.button_out_trip:
                outTrip();
                break;
        }
    }

    private void outTrip() {
        showLoading();
//        Use "name" as code of selected trip to send request
        mUserLocation.getUser().setName(mTrip.getCode());
        mTripService.outTrip(mUserLocation).enqueue(new Callback<Boolean>() {
            @Override
            public void onResponse(Call<Boolean> call, Response<Boolean> response) {
                hideLoading();
                startActivity(MapsActivity.getIntent(getApplicationContext()));
            }

            @Override
            public void onFailure(Call<Boolean> call, Throwable t) {

            }
        });
    }

    private void updateTrip() {
        showLoading();
        mTrip.setName(mTextNameTrip.getText().toString());
        mToolbar.setTitle(mTrip.getName());
        mTripService.updateTrip(mTrip).enqueue(new Callback<Trip>() {
            @Override
            public void onResponse(Call<Trip> call, Response<Trip> response) {
                hideLoading();
                mTextNameTrip.setText(mTrip.getName());
                Toast.makeText(SettingTripActivity.this, "Done", Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onFailure(Call<Trip> call, Throwable t) {

            }
        });
    }

    private void receiveData() {
        mTrip = new Trip();
        mUserLocation = new UserLocation();
        Intent intent = getIntent();
        if (intent.getExtras() != null) {
            mTrip = intent.getExtras().getParcelable(ShareCodeActivity.EXTRA_TRIP);
            mUserLocation = intent.getExtras().getParcelable(EXTRA_USER_LOCATION);
        }

    }

    private void initView() {
        mTextNameTrip = findViewById(R.id.text_name_trip);
        mTextIdTrip = findViewById(R.id.text_id_trip);
        mTextIdTrip.setEnabled(false);
        mProgressBar = findViewById(R.id.progress_bar_loading);
        mButtonOutTrip = findViewById(R.id.button_out_trip);
        mButtonOutTrip.setOnClickListener(this);
        mTextNameTrip.setText(mTrip.getName());
        mTextIdTrip.setText(mTrip.getCode());
    }

    private void initToolbar() {
        mToolbar = findViewById(R.id.toolbar);
        setSupportActionBar(mToolbar);
        if (mTrip != null && !mTrip.getName().equals("")) {
            getSupportActionBar().setTitle(mTrip.getName());
        }
        getSupportActionBar().setDisplayShowTitleEnabled(true);
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        getSupportActionBar().setDisplayShowHomeEnabled(true);
        mToolbar.setNavigationIcon(R.drawable.ic_left_arrow);
        mButtonDone = mToolbar.findViewById(R.id.btn_create_done);
        mButtonDone.setOnClickListener(this);
    }

    @Override
    public void showLoading() {
        mProgressBar.setVisibility(View.VISIBLE);
    }

    @Override
    public void hideLoading() {
        mProgressBar.setVisibility(View.GONE);
    }

    @Override
    public void updateUserLocation(UserLocation userLocation) {
        mUserLocation = userLocation;
    }
}